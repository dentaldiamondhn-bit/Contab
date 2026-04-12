'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [page, selectedTable]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/audit-logs?page=${page}&limit=20${selectedTable !== 'all' ? `&table=${selectedTable}` : ''}`);
      if (response.ok) {
        const data: AuditLogResponse = await response.json();
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } else {
        console.error('Failed to load audit logs');
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return '+';
      case 'UPDATE':
        return '↻';
      case 'DELETE':
        return '×';
      default:
        return '•';
    }
  };

  const formatJson = (data: any) => {
    return JSON.stringify(data, null, 2);
  };

  const exportToCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      'Timestamp',
      'Table',
      'Record ID',
      'Action',
      'User ID',
      'Changed Fields',
      'IP Address'
    ];

    const rows = logs.map(log => [
      formatDate(log.timestamp),
      log.tableName,
      log.recordId,
      log.action,
      log.userId || 'N/A',
      log.changedFields ? log.changedFields.join(', ') : 'N/A',
      log.ipAddress || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Audit Logs</h1>
        <p className="text-gray-600">
          Track all changes to transactions and journal entries
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Filter by Table:
            </label>
            <select
              value={selectedTable}
              onChange={(e) => {
                setSelectedTable(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Tables</option>
              <option value="transaction">Transactions</option>
              <option value="journalentry">Journal Entries</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={loadLogs} disabled={loading} variant="outline">
              Refresh
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-600">Total Changes</h3>
          <p className="text-2xl font-bold">{total}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-600">Creates</h3>
          <p className="text-2xl font-bold text-green-600">
            {logs.filter(l => l.action === 'CREATE').length}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-600">Updates</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {logs.filter(l => l.action === 'UPDATE').length}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-600">Deletes</h3>
          <p className="text-2xl font-bold text-red-600">
            {logs.filter(l => l.action === 'DELETE').length}
          </p>
        </Card>
      </div>

      {/* Audit Logs List */}
      <Card className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No audit logs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)} {log.action}
                    </span>
                    <span className="font-medium">{log.tableName}</span>
                    <span className="text-sm text-gray-500">ID: {log.recordId}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{formatDate(log.timestamp)}</p>
                    {log.userId && (
                      <p className="text-xs text-gray-500">User: {log.userId}</p>
                    )}
                  </div>
                </div>

                {log.changedFields && log.changedFields.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700">Changed Fields:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {log.changedFields.map((field, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  {expandedLog === log.id ? 'Hide Details' : 'Show Details'}
                </Button>

                {expandedLog === log.id && (
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {log.oldValues && (
                      <div>
                        <h4 className="font-medium text-red-600 mb-2">Old Values:</h4>
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                          {formatJson(log.oldValues)}
                        </pre>
                      </div>
                    )}
                    {log.newValues && (
                      <div>
                        <h4 className="font-medium text-green-600 mb-2">New Values:</h4>
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                          {formatJson(log.newValues)}
                        </pre>
                      </div>
                    )}
                    {log.userAgent && (
                      <div className="lg:col-span-2">
                        <h4 className="font-medium text-gray-700 mb-1">User Agent:</h4>
                        <p className="text-xs text-gray-600 break-all">{log.userAgent}</p>
                      </div>
                    )}
                    {log.ipAddress && (
                      <div className="lg:col-span-2">
                        <h4 className="font-medium text-gray-700 mb-1">IP Address:</h4>
                        <p className="text-sm text-gray-600">{log.ipAddress}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
