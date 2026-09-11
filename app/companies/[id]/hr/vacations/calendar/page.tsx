'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Filter, X } from 'lucide-react';

type IconName = 'Plane' | 'Heart' | 'Stethoscope' | 'BriefcaseBusiness' | 'Ban' | 'Star' | 'Zap' | 'Gift' | 'Home' | 'BookOpen' | 'Shield' | 'Coffee';

const COLOR_OPTIONS: Record<string, { text: string; bg: string; border: string; dot: string; light: string }> = {
  blue:   { text: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-300',   dot: 'bg-blue-500',   light: 'bg-blue-50' },
  pink:   { text: 'text-pink-700',   bg: 'bg-pink-100',   border: 'border-pink-300',   dot: 'bg-pink-500',   light: 'bg-pink-50' },
  red:    { text: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-300',    dot: 'bg-red-500',    light: 'bg-red-50' },
  purple: { text: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-300', dot: 'bg-purple-500', light: 'bg-purple-50' },
  gray:   { text: 'text-gray-700',   bg: 'bg-gray-100',   border: 'border-gray-300',   dot: 'bg-gray-500',   light: 'bg-gray-50' },
  green:  { text: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-300',  dot: 'bg-green-500',  light: 'bg-green-50' },
  orange: { text: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-300', dot: 'bg-orange-500', light: 'bg-orange-50' },
  cyan:   { text: 'text-cyan-700',   bg: 'bg-cyan-100',   border: 'border-cyan-300',   dot: 'bg-cyan-500',   light: 'bg-cyan-50' },
};

const DEFAULT_TYPES = [
  { id: 'vacaciones', label: 'Vacaciones', colorValue: 'blue' },
  { id: 'personal', label: 'Permiso Personal', colorValue: 'pink' },
  { id: 'enfermedad', label: 'Enfermedad', colorValue: 'red' },
  { id: 'especial', label: 'Permiso Especial', colorValue: 'purple' },
  { id: 'sin_sueldo', label: 'Sin Goce de Sueldo', colorValue: 'gray' },
];

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

interface PermissionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  typeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  startDate: string;
  salary: number;
  status: string;
}

interface CalendarEvent {
  request: PermissionRequest;
  color: string;
  isStart: boolean;
  isEnd: boolean;
}

function getColor(value: string) {
  return COLOR_OPTIONS[value] || COLOR_OPTIONS.blue;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
}

function dateToStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const s = parseDate(start);
  const e = parseDate(end);
  const current = new Date(s);
  while (current <= e) {
    days.push(dateToStr(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export default function VacationCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [permTypes, setPermTypes] = useState(DEFAULT_TYPES);

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, typesRes, reqsRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/hr/payroll/employees`),
        fetch(`/api/companies/${companyId}/hr/permissions/types`),
        fetch(`/api/companies/${companyId}/hr/permissions/requests`),
      ]);
      if (empRes.ok) {
        const data = await empRes.json();
        if (Array.isArray(data)) {
          setEmployees(data.map((e: any) => ({
            id: e.id,
            firstName: (e.name || '').split(' ')[0] || '',
            lastName: (e.name || '').split(' ').slice(1).join(' ') || '',
            position: e.position || '',
            department: e.department || '',
            startDate: e.startDate || '',
            salary: e.salary || 0,
            status: e.status || 'active',
          })));
        }
      }
      if (typesRes.ok) {
        const types = await typesRes.json();
        if (Array.isArray(types) && types.length > 0) setPermTypes(types);
      }
      if (reqsRes.ok) {
        const reqs = await reqsRes.json();
        if (Array.isArray(reqs)) setRequests(reqs);
      }
    } catch (e) {
      console.error('Error fetching calendar data:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesEmployee = filterEmployee === 'all' || r.employeeId === filterEmployee;
      const matchesType = filterType === 'all' || r.typeId === filterType;
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchesEmployee && matchesType && matchesStatus;
    });
  }, [requests, filterEmployee, filterType, filterStatus]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];

    const prevMonthLast = new Date(currentYear, currentMonth, 0);
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLast.getDate() - i);
      days.push({ date: d, dateStr: dateToStr(d), isCurrentMonth: false, isToday: false });
    }

    const today = dateToStr(new Date());
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const ds = dateToStr(d);
      days.push({ date: d, dateStr: ds, isCurrentMonth: true, isToday: ds === today });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      days.push({ date: d, dateStr: dateToStr(d), isCurrentMonth: false, isToday: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredRequests.forEach(req => {
      const days = getDaysInRange(req.startDate, req.endDate);
      const pt = permTypes.find(t => t.id === req.typeId);
      const color = pt?.colorValue || 'blue';
      days.forEach((day, idx) => {
        if (!map[day]) map[day] = [];
        map[day].push({
          request: req,
          color,
          isStart: idx === 0,
          isEnd: idx === days.length - 1,
        });
      });
    });
    return map;
  }, [filteredRequests, permTypes]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventsByDay[selectedDay] || [];
  }, [selectedDay, eventsByDay]);

  const monthStats = useMemo(() => {
    const firstStr = dateToStr(new Date(currentYear, currentMonth, 1));
    const lastStr = dateToStr(new Date(currentYear, currentMonth + 1, 0));
    let totalDays = 0;
    let activeEmployees = 0;
    const empSet = new Set<string>();
    filteredRequests.forEach(req => {
      const reqStart = req.startDate > firstStr ? req.startDate : firstStr;
      const reqEnd = req.endDate < lastStr ? req.endDate : lastStr;
      if (reqStart <= reqEnd) {
        totalDays += getDaysInRange(reqStart, reqEnd).length;
        empSet.add(req.employeeId);
      }
    });
    activeEmployees = empSet.size;
    return { totalDays, activeEmployees, totalRequests: filteredRequests.length };
  }, [filteredRequests, currentYear, currentMonth]);

  const navigateMonth = (dir: number) => {
    setSelectedDay(null);
    const newDate = new Date(currentYear, currentMonth + dir, 1);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth());
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDay(dateToStr(now));
  };

  const hasActiveFilters = filterEmployee !== 'all' || filterType !== 'all' || filterStatus !== 'all';

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push(`/companies/${companyId}/hr/vacations`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Calendario de Vacaciones y Permisos
          </h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="py-3">
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-blue-600">{monthStats.totalDays}</div>
            <div className="text-xs text-gray-500">Días este mes</div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-green-600">{monthStats.activeEmployees}</div>
            <div className="text-xs text-gray-500">Empleados ausentes</div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-purple-600">{monthStats.totalRequests}</div>
            <div className="text-xs text-gray-500">Solicitudes</div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredRequests.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-xs text-gray-500">Pendientes</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-gray-500" />
            <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm">
              <option value="all">Todos los empleados</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm">
              <option value="all">Todos los tipos</option>
              {permTypes.map(pt => (
                <option key={pt.id} value={pt.id}>{pt.label}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
              className="border rounded px-2 py-1.5 text-sm">
              <option value="all">Todos los estados</option>
              <option value="approved">Aprobadas</option>
              <option value="pending">Pendientes</option>
              <option value="rejected">Rechazadas</option>
            </select>
            {hasActiveFilters && (
              <button onClick={() => { setFilterEmployee('all'); setFilterType('all'); setFilterStatus('all'); }}
                className="text-sm text-blue-600 underline flex items-center gap-1">
                <X className="h-3 w-3" /> Limpiar
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="ml-2">
            Hoy
          </Button>
        </div>
        {/* Legend */}
        <div className="hidden md:flex items-center gap-3">
          {permTypes.map(pt => {
            const c = getColor(pt.colorValue);
            return (
              <div key={pt.id} className="flex items-center gap-1 text-xs">
                <div className={`w-3 h-3 rounded-sm ${c.dot}`} />
                <span className="text-gray-600">{pt.label}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm bg-yellow-400" />
            <span className="text-gray-600">Pendiente</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day name headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {DAY_NAMES.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const events = eventsByDay[day.dateStr] || [];
            const isSelected = selectedDay === day.dateStr;
            return (
              <div
                key={idx}
                onClick={() => setSelectedDay(isSelected ? null : day.dateStr)}
                className={`min-h-[90px] border-b border-r p-1.5 cursor-pointer transition-colors ${
                  !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white hover:bg-gray-50'
                } ${day.isToday ? 'ring-2 ring-inset ring-blue-500' : ''} ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}`}
              >
                <div className={`text-xs font-medium mb-1 ${day.isToday ? 'text-blue-600 font-bold' : ''}`}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {events.slice(0, 3).map((ev, i) => {
                    const c = getColor(ev.color);
                    return (
                      <div
                        key={i}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${c.bg} ${c.text} border ${c.border}`}
                        title={`${ev.request.employeeName} — ${ev.request.days} día(s)`}
                      >
                        {ev.isStart ? ev.request.employeeName.split(' ')[0] : '→'}
                        {ev.request.days > 1 && !ev.isEnd && ' ─'}
                      </div>
                    );
                  })}
                  {events.length > 3 && (
                    <div className="text-[10px] text-gray-500 font-medium">+{events.length - 3} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>
                {formatDate(selectedDay)} — {selectedDayEvents.length} permiso(s)
              </span>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay permisos en este día</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((ev, i) => {
                  const c = getColor(ev.color);
                  const pt = permTypes.find(t => t.id === ev.request.typeId);
                  return (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${c.border} ${c.light}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${c.bg} ${c.text}`}>
                            {pt?.label || ev.request.typeId}
                          </span>
                          <span className="font-medium text-sm">{ev.request.employeeName}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            ev.request.status === 'approved' ? 'bg-green-100 text-green-700' :
                            ev.request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {ev.request.status === 'approved' ? 'Aprobada' :
                             ev.request.status === 'pending' ? 'Pendiente' : 'Rechazada'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(ev.request.startDate)} — {formatDate(ev.request.endDate)} • {ev.request.days} día(s)
                        </div>
                        {ev.request.reason && (
                          <div className="text-xs text-gray-400 mt-0.5">{ev.request.reason}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mobile legend */}
      <div className="md:hidden flex flex-wrap items-center gap-3 justify-center">
        {permTypes.map(pt => {
          const c = getColor(pt.colorValue);
          return (
            <div key={pt.id} className="flex items-center gap-1 text-xs">
              <div className={`w-3 h-3 rounded-sm ${c.dot}`} />
              <span className="text-gray-600">{pt.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
