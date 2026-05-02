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
  ArrowLeft,
  Download,
  Users,
  Building2,
  Database,
  Trash2,
  Edit,
  Plus
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
  userName?: string;
  userEmail?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
  tenantId?: string;
  tenantName?: string;
}

export default function AdminAuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'CREATE' | 'UPDATE' | 'DELETE'>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('7');

  useEffect(() => {
    fetchAuditLogs();
  }, [dateRange]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/audit-logs?days=${dateRange}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar los logs de auditoría');
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      setError('Error al cargar los logs de auditoría');
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

  const getUniqueTables = () => {
    const tables = new Set(logs.map(log => log.tableName));
    return Array.from(tables).sort();
  };

  const filteredLogs = logs.filter(log => {
    const matchesAction = filter === 'all' || log.action === filter;
    const matchesTable = tableFilter === 'all' || log.tableName === tableFilter;
    const matchesSearch = !searchTerm || 
      log.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recordId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.tenantName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAction && matchesTable && matchesSearch;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'UPDATE':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTableIcon = (tableName: string) => {
    const lower = tableName.toLowerCase();
    if (lower.includes('user')) return <Users className="w-4 h-4" />;
    if (lower.includes('tenant') || lower.includes('company')) return <Building2 className="w-4 h-4" />;
    if (lower.includes('invoice') || lower.includes('payment') || lower.includes('billing')) return <FileText className="w-4 h-4" />;
    return <Database className="w-4 h-4" />;
  };

  const exportLogs = () => {
    const csvContent = [
      ['Fecha', 'Usuario', 'Email', 'Acción', 'Tabla', 'Registro', 'Tenant', 'IP'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.userName || 'N/A',
        log.userEmail || 'N/A',
        log.action,
        log.tableName,
        log.recordId,
        log.tenantName || 'N/A',
        log.ipAddress || 'N/A'
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver al Dashboard
            </button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Auditoría del Sistema</h1>
              <p className="text-gray-600 mt-1">Registro completo de actividades y cambios en el sistema</p>
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
              <Button
                onClick={exportLogs}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
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
                <Shield className="w-8 h-8 text-blue-400" />
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
                <Plus className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Actualizaciones</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {logs.filter(l => l.action === 'UPDATE').length}
                  </p>
                </div>
                <Edit className="w-8 h-8 text-blue-400" />
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
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar por tabla, registro, usuario o tenant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1">Últimas 24 horas</option>
                  <option value="7">Últimos 7 días</option>
                  <option value="30">Últimos 30 días</option>
                  <option value="90">Últimos 90 días</option>
                </select>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todas las acciones</option>
                  <option value="CREATE">Creaciones</option>
                  <option value="UPDATE">Actualizaciones</option>
                  <option value="DELETE">Eliminaciones</option>
                </select>
                <select
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todas las tablas</option>
                  {getUniqueTables().map(table => (
                    <option key={table} value={table}>{table}</option>
                  ))}
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
                        <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg">
                          {getActionIcon(log.action)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                              {getTableIcon(log.tableName)}
                              {log.tableName}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">
                            Registro: <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{log.recordId}</span>
                          </p>
                          {log.tenantName && (
                            <p className="text-xs text-blue-600 mt-1">
                              <Building2 className="w-3 h-3 inline mr-1" />
                              {log.tenantName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          {log.userName && (
                            <p className="text-sm font-medium text-gray-900">{log.userName}</p>
                          )}
                          {log.userEmail && (
                            <p className="text-xs text-gray-500">{log.userEmail}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(log.timestamp).toLocaleDateString('es-HN')}
                            {' '}
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {log.ipAddress && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Dirección IP:</span>
                                <span className="text-sm text-gray-600 ml-2 font-mono">{log.ipAddress}</span>
                              </div>
                            )}
                            {log.userAgent && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">User Agent:</span>
                                <span className="text-sm text-gray-600 ml-2 text-xs">{log.userAgent}</span>
                              </div>
                            )}
                          </div>
                          
                          {log.changedFields && log.changedFields.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Campos modificados:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {log.changedFields.map((field, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                    {field}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {log.oldValues && (
                              <div>
                                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                  <Trash2 className="w-3 h-3" />
                                  Valores anteriores:
                                </span>
                                <pre className="mt-1 p-2 bg-red-50 border border-red-100 rounded text-xs overflow-x-auto">
                                  {log.oldValues}
                                </pre>
                              </div>
                            )}
                            {log.newValues && (
                              <div>
                                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                  <Plus className="w-3 h-3" />
                                  Nuevos valores:
                                </span>
                                <pre className="mt-1 p-2 bg-green-50 border border-green-100 rounded text-xs overflow-x-auto">
                                  {log.newValues}
                                </pre>
                              </div>
                            )}
                          </div>
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
