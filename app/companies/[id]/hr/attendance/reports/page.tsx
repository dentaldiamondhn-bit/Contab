'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Users, UserCheck, UserX, Clock, Calendar, TrendingUp,
  AlertTriangle, DollarSign, Download, BarChart3, Plane, Activity,
  FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Area, AreaChart
} from 'recharts';

interface ReportData {
  summary: {
    totalActiveEmployees: number;
    totalRecords: number;
    overallAttendanceRate: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    vacationCount: number;
    overtimeCount: number;
    disabilityCount: number;
    totalDeductions: number;
    totalOvertimeIncome: number;
    totalOvertimeHours: number;
    holidayCount: number;
  };
  statusDistribution: { status: string; count: number }[];
  dailyTrend: {
    date: string;
    present: number;
    absent: number;
    late: number;
    vacation: number;
    attendanceRate: number;
    overtimeHours: number;
  }[];
  employeeRanking: {
    employeeId: string;
    name: string;
    department: string;
    absences: number;
    tardies: number;
    vacations: number;
    overtimeHours: number;
    totalDeductions: number;
  }[];
  disabilityDistribution: { type: string; count: number }[];
  holidays: { date: string; name: string; type: string }[];
  dateRange: { start: string; end: string };
}

const STATUS_LABELS: Record<string, string> = {
  present: 'Presente', absent: 'Ausente', late: 'Tardanza',
  vacation: 'Vacaciones', overtime: 'Horas Extra', unpaid_leave: 'Permiso Sin Sueldo',
  disability: 'Incapacidad', holiday: 'Feriado', free_day: 'Día Libre',
};

const STATUS_COLORS: Record<string, string> = {
  present: '#22c55e', absent: '#ef4444', late: '#f59e0b',
  vacation: '#3b82f6', overtime: '#8b5cf6', unpaid_leave: '#6b7280',
  disability: '#ec4899', holiday: '#06b6d4', free_day: '#94a3b8',
};

const DISABILITY_LABELS: Record<string, string> = {
  patron_100: '100% Patrono', ihss_33: 'IHSS (33%)',
  no_pay: 'Sin Pago', maternity: 'Maternidad (84 días)',
};

export default function AttendanceReportsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0],
    };
  });

  useEffect(() => {
    loadReport();
  }, [companyId, dateRange]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/hr/attendance/reports?start=${dateRange.start}&end=${dateRange.end}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error loading report:', e);
    }
    setLoading(false);
  };

  const navigateMonth = (dir: number) => {
    const [y, m] = dateRange.start.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    setDateRange({
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0],
    });
  };

  const formatCurrency = (v: number) => `L ${v.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Empleado', 'Depto', 'Faltas', 'Tardanzas', 'Vacaciones', 'Horas Extra', 'Deducciones']];
    data.employeeRanking.forEach(e => {
      rows.push([e.name, e.department, String(e.absences), String(e.tardies), String(e.vacations), String(e.overtimeHours), String(e.totalDeductions)]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `asistencia_${dateRange.start}_${dateRange.end}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/companies/${companyId}/hr/attendance`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />Asistencia
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />Reportes de Asistencia
            </h1>
            <p className="text-sm text-gray-500">Análisis y estadísticas del período seleccionado</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
            <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {new Date(dateRange.start + 'T12:00:00').toLocaleDateString('es-HN', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />CSV</Button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{s?.totalActiveEmployees || 0}</p>
              <p className="text-xs text-gray-500">Empleados Activos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Activity className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{s?.overallAttendanceRate || 0}%</p>
              <p className="text-xs text-gray-500">Asistencia General</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <UserCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{s?.presentCount || 0}</p>
              <p className="text-xs text-gray-500">Presentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <UserX className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{s?.absentCount || 0}</p>
              <p className="text-xs text-gray-500">Ausencias</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-600">{s?.lateCount || 0}</p>
              <p className="text-xs text-gray-500">Tardanzas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{s?.totalOvertimeHours || 0}h</p>
              <p className="text-xs text-gray-500">Horas Extra</p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg"><DollarSign className="h-5 w-5 text-red-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">Total Deducciones</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(s?.totalDeductions || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">Ingresos Horas Extra</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(s?.totalOvertimeIncome || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg"><Calendar className="h-5 w-5 text-cyan-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">Feriados en Período</p>
                  <p className="text-lg font-bold text-cyan-600">{s?.holidayCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Attendance Trend */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-sm font-medium">Tendencia Diaria de Asistencia</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data?.dailyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={v => new Date(v + 'T12:00:00').toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={v => new Date(v + 'T12:00:00').toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })} />
                  <Legend />
                  <Area type="monotone" dataKey="present" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Presentes" />
                  <Area type="monotone" dataKey="late" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Tardanzas" />
                  <Area type="monotone" dataKey="absent" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Ausentes" />
                  <Area type="monotone" dataKey="vacation" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Vacaciones" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution Pie */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Distribución por Estado</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data?.statusDistribution.map(d => ({ ...d, label: STATUS_LABELS[d.status] || d.status })) || []}
                    cx="50%" cy="50%" outerRadius={100} dataKey="count" nameKey="label" label={({ label, count }) => `${label}: ${count}`}
                  >
                    {(data?.statusDistribution || []).map((d, i) => (
                      <Cell key={i} fill={STATUS_COLORS[d.status] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Overtime Chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Horas Extra por Día</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.dailyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={v => new Date(v + 'T12:00:00').toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={v => new Date(v + 'T12:00:00').toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })} />
                <Bar dataKey="overtimeHours" fill="#8b5cf6" name="Horas Extra" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Employee Ranking Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />Ranking de Asistencia por Empleado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Empleado</th>
                    <th className="text-left p-2 font-medium">Departamento</th>
                    <th className="text-center p-2 font-medium text-red-600">Faltas</th>
                    <th className="text-center p-2 font-medium text-amber-600">Tardanzas</th>
                    <th className="text-center p-2 font-medium text-blue-600">Vacaciones</th>
                    <th className="text-center p-2 font-medium text-purple-600">Horas Extra</th>
                    <th className="text-right p-2 font-medium text-red-600">Deducciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.employeeRanking || []).map((e, i) => (
                    <tr key={e.employeeId} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-gray-500">{i + 1}</td>
                      <td className="p-2 font-medium">{e.name}</td>
                      <td className="p-2 text-gray-600">{e.department}</td>
                      <td className="p-2 text-center">
                        {e.absences > 0 ? <Badge variant="destructive">{e.absences}</Badge> : <span className="text-gray-300">0</span>}
                      </td>
                      <td className="p-2 text-center">
                        {e.tardies > 0 ? <Badge className="bg-amber-100 text-amber-700">{e.tardies}</Badge> : <span className="text-gray-300">0</span>}
                      </td>
                      <td className="p-2 text-center">
                        {e.vacations > 0 ? <Badge className="bg-blue-100 text-blue-700">{e.vacations}</Badge> : <span className="text-gray-300">0</span>}
                      </td>
                      <td className="p-2 text-center">
                        {e.overtimeHours > 0 ? <Badge className="bg-purple-100 text-purple-700">{e.overtimeHours}h</Badge> : <span className="text-gray-300">0</span>}
                      </td>
                      <td className="p-2 text-right font-medium text-red-600">
                        {e.totalDeductions > 0 ? formatCurrency(e.totalDeductions) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data?.employeeRanking || data.employeeRanking.length === 0) && (
                <p className="text-center py-8 text-gray-500">Sin datos de asistencia en este período</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Disability Distribution */}
        {data?.disabilityDistribution && data.disabilityDistribution.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />Incapacidades por Tipo
            </CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.disabilityDistribution.map(d => (
                  <div key={d.type} className="text-center p-4 bg-pink-50 rounded-lg">
                    <p className="text-2xl font-bold text-pink-600">{d.count}</p>
                    <p className="text-xs text-gray-600">{DISABILITY_LABELS[d.type] || d.type}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Holidays */}
        {data?.holidays && data.holidays.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />Feriados en el Período
            </CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.holidays.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-cyan-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-cyan-600" />
                    <div>
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-xs text-gray-500">{new Date(h.date + 'T12:00:00').toLocaleDateString('es-HN', { day: 'numeric', month: 'long' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
