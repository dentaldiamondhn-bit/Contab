'use client';

import { useState, useEffect, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Search,
  Filter,
  ChevronDown,
  Clock,
  User,
  FileText,
  Shield,
  CalendarDays,
} from 'lucide-react';

interface AuditLog {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  action: string;
  old_values: any;
  new_values: any;
  performed_by: string;
  performed_at: string;
}

interface DayGroup {
  date: string;
  label: string;
  logs: AuditLog[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = d.toDateString() === today.toDateString();
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const formatted = d.toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isToday) return `Hoy - ${formatted}`;
  if (isYesterday) return `Ayer - ${formatted}`;
  return formatted;
}

const ACTION_LABELS: Record<string, string> = {
  OPENING_BALANCE_UPDATE: 'Saldo de Apertura',
  INSERT: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
};

const ACTION_COLORS: Record<string, string> = {
  OPENING_BALANCE_UPDATE: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  INSERT: 'bg-green-100 text-green-700 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
};

function groupByDay(logs: AuditLog[]): DayGroup[] {
  const map = new Map<string, AuditLog[]>();
  for (const log of logs) {
    const dateStr = new Date(log.performed_at).toISOString().split('T')[0];
    if (!map.has(dateStr)) map.set(dateStr, []);
    map.get(dateStr)!.push(log);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, logs]) => ({
      date,
      label: formatDayLabel(date),
      logs,
    }));
}

export default function AccountingAuditPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchCode, setSearchCode] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadLogs();
  }, [companyId, page, filterAction]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId: companyId,
        page: page.toString(),
        limit: '50',
      });
      if (filterAction) params.set('action', filterAction);
      if (searchCode) params.set('accountCode', searchCode);

      const res = await fetch(`/api/accounting/audit-logs?${params.toString()}`, {
        headers: { 'x-tenant-id': companyId }
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);

        const dayGroups = groupByDay(data.logs || []);
        setExpandedDays(new Set(dayGroups.map(g => g.date)));
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    setPage(1);
    loadLogs();
  };

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const expandAll = () => {
    const dayGroups = groupByDay(logs);
    setExpandedDays(new Set(dayGroups.map(g => g.date)));
  };

  const collapseAll = () => {
    setExpandedDays(new Set());
  };

  const dayGroups = groupByDay(logs);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/companies/${companyId}/accounting`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Historial de Auditoría</h1>
                  <p className="text-sm text-gray-500">Registro inmutable de cambios contables</p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              {total} registros
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por código de cuenta..."
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Todas las acciones</option>
                <option value="OPENING_BALANCE_UPDATE">Saldos de Apertura</option>
                <option value="INSERT">Creaciones</option>
                <option value="UPDATE">Actualizaciones</option>
                <option value="DELETE">Eliminaciones</option>
              </select>
              <Button variant="outline" onClick={handleSearch}>
                <Filter className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={expandAll}>
                  Expandir todo
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAll}>
                  Colapsar todo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando historial...</div>
            ) : dayGroups.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                No hay registros de auditoría
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="table-fixed w-full min-w-[1100px]">
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[50px] px-4"></TableHead>
                      <TableHead className="w-[200px] px-6">Hora</TableHead>
                      <TableHead className="w-[260px] px-6">Cuenta</TableHead>
                      <TableHead className="w-[180px] px-6">Acción</TableHead>
                      <TableHead className="w-[160px] px-6">Saldo Anterior</TableHead>
                      <TableHead className="w-[160px] px-6">Saldo Nuevo</TableHead>
                      <TableHead className="w-[140px] px-6">Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayGroups.map((group) => {
                      const isDayExpanded = expandedDays.has(group.date);

                      return (
                        <Fragment key={group.date}>
                          <TableRow
                            className="bg-purple-50 hover:bg-purple-100 cursor-pointer select-none border-t-2 border-purple-200"
                            onClick={() => toggleDay(group.date)}
                          >
                            <TableCell className="px-4">
                              <ChevronDown
                                className={`h-5 w-5 text-purple-600 transition-transform duration-200 ${
                                  isDayExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </TableCell>
                            <TableCell colSpan={2} className="px-6">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-purple-500" />
                                <span className="font-semibold text-purple-900">{group.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-6">
                              <Badge className="bg-purple-100 text-purple-700">
                                {group.logs.length} {group.logs.length === 1 ? 'cambio' : 'cambios'}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6">
                              <span className="text-sm text-purple-600">
                                {formatCurrency(group.logs.reduce((sum, l) => sum + (l.new_values?.opening_balance || 0), 0))}
                              </span>
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>

                          {isDayExpanded && group.logs.map((log) => {
                            const oldBal = log.old_values?.opening_balance ?? null;
                            const newBal = log.new_values?.opening_balance ?? null;

                            return (
                              <TableRow key={log.id} className="hover:bg-gray-50">
                                <TableCell className="px-4">
                                  <div className="w-2 h-2 rounded-full bg-gray-300 ml-2" />
                                </TableCell>
                                <TableCell className="w-[200px] px-6 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                                    {formatTime(log.performed_at)}
                                  </div>
                                </TableCell>
                                <TableCell className="w-[260px] px-6 font-mono text-sm font-medium">
                                  {log.account_code ? (
                                    <div>
                                      <span className="font-semibold">{log.account_code}</span>
                                      {log.account_name && (
                                        <span className="block text-xs text-gray-500 font-normal">{log.account_name}</span>
                                      )}
                                    </div>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="w-[180px] px-6">
                                  <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100'}>
                                    {ACTION_LABELS[log.action] || log.action}
                                  </Badge>
                                </TableCell>
                                <TableCell className="w-[160px] px-6 text-sm">
                                  {oldBal !== null ? formatCurrency(oldBal) : '-'}
                                </TableCell>
                                <TableCell className="w-[160px] px-6 text-sm font-medium">
                                  {newBal !== null ? formatCurrency(newBal) : '-'}
                                </TableCell>
                                <TableCell className="w-[140px] px-6 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3 text-gray-400 shrink-0" />
                                    {log.performed_by || 'Sistema'}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
