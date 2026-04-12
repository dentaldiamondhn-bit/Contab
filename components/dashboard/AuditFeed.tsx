'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  User, 
  Clock, 
  FileText, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  Activity,
  Database
} from 'lucide-react';

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
}

interface AuditFeedProps {
  maxItems?: number;
  showFilters?: boolean;
  autoRefresh?: boolean;
}

export default function ActiveAuditFeed({ 
  maxItems = 10, 
  showFilters = true, 
  autoRefresh = true 
}: AuditFeedProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'CREATE' | 'UPDATE' | 'DELETE'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    fetchAuditLogs();
    const interval = setInterval(fetchAuditLogs, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [filter, searchTerm, autoRefresh]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/audit-logs?limit=${maxItems}&filter=${filter}&search=${searchTerm}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs || []);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'UPDATE':
        return <Activity className="w-4 h-4 text-indigo-600" />;
      case 'DELETE':
        return <TrendingDown className="w-4 h-4 text-rose-600" />;
      default:
        return <Database className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'border-emerald-500 bg-emerald-50';
      case 'UPDATE':
        return 'border-indigo-500 bg-indigo-50';
      case 'DELETE':
        return 'border-rose-500 bg-rose-50';
      default:
        return 'border-slate-500 bg-slate-50';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'Created';
      case 'UPDATE':
        return 'Modified';
      case 'DELETE':
        return 'Deleted';
      default:
        return 'Unknown';
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const names: Record<string, string> = {
      'Account': 'Chart of Accounts',
      'Transaction': 'Transaction/Póliza',
      'JournalEntry': 'Journal Entry',
      'TaxConfig': 'Tax Configuration',
      'BookClosing': 'Period Closing',
      'AuditLog': 'Audit Log'
    };
    return names[tableName] || tableName;
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  const parseAuditData = (data: string) => {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };

  const getChangedFieldsDisplay = (changedFields: string[]) => {
    if (!changedFields || changedFields.length === 0) return null;
    
    const fieldNames: Record<string, string> = {
      'amount': 'Amount',
      'description': 'Description',
      'date': 'Date',
      'accountCode': 'Account Code',
      'rate': 'Tax Rate',
      'isActive': 'Status'
    };
    
    return changedFields.map(field => fieldNames[field] || field).join(', ');
  };

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.action !== filter) return false;
    if (searchTerm && !log.recordId.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <Card className="bg-white border border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-lg font-bold text-slate-900 font-inter">
              Active Audit Feed
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {isClient && (
              <span className="text-xs text-slate-500 font-inter">
                Last: {lastRefresh?.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAuditLogs}
              disabled={loading}
              className="h-8 px-3 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {showFilters && (
          <div className="flex items-center space-x-3 mt-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-xs border-slate-300 rounded px-2 py-1 font-inter"
              >
                <option value="all">All Actions</option>
                <option value="CREATE">Created</option>
                <option value="UPDATE">Modified</option>
                <option value="DELETE">Deleted</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by record ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs border-slate-300 rounded px-2 py-1 w-32 font-inter"
              />
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            <span className="ml-2 text-sm text-slate-500 font-inter">Loading audit logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Database className="w-6 h-6 text-slate-400" />
            <span className="ml-2 text-sm text-slate-500 font-inter">No audit logs found</span>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className={`flex items-start gap-3 p-3 border-l-4 ${getActionColor(log.action)} hover:bg-slate-50 transition-colors`}>
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(log.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900 font-inter">
                        {getActionLabel(log.action)} {getTableDisplayName(log.tableName)}
                      </span>
                      {log.recordId && (
                        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                          #{log.recordId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500 font-inter">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      {log.changedFields && log.changedFields.length > 0 && (
                        <button
                          onClick={() => toggleLogExpansion(log.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-inter"
                        >
                          {expandedLogs.has(log.id) ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 mt-1">
                    {log.userId && (
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600 font-inter">
                          User {log.userId}
                        </span>
                      </div>
                    )}
                    
                    {log.ipAddress && (
                      <div className="flex items-center space-x-1">
                        <Activity className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600 font-mono">
                          {log.ipAddress}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {log.changedFields && log.changedFields.length > 0 && (
                    <div className="mt-2 text-xs text-slate-600 font-inter">
                      <span className="font-medium">Changed:</span> {getChangedFieldsDisplay(log.changedFields)}
                    </div>
                  )}
                  
                  {expandedLogs.has(log.id) && (
                    <div className="mt-3 p-3 bg-slate-50 rounded border border-slate-200">
                      <div className="grid grid-cols-2 gap-4">
                        {log.oldValues && (
                          <div>
                            <p className="text-xs font-medium text-slate-700 font-inter mb-1">Before:</p>
                            <pre className="text-xs text-slate-600 font-mono bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                              {JSON.stringify(parseAuditData(log.oldValues), null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.newValues && (
                          <div>
                            <p className="text-xs font-medium text-slate-700 font-inter mb-1">After:</p>
                            <pre className="text-xs text-slate-600 font-mono bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                              {JSON.stringify(parseAuditData(log.newValues), null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                      
                      {log.userAgent && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs text-slate-500 font-inter">
                            User Agent: {log.userAgent}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {filteredLogs.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-inter">
                Showing {filteredLogs.length} of {logs.length} audit logs
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 font-inter"
              >
                <Eye className="w-3 h-3 mr-1" />
                View All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
